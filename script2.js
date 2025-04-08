/**
 * PostIt.js
 *
 * @auteur     marc laville
 * @Copyleft 2015-2020
 * @date       29/06/2015
 * @version    0.2.0
 * @revision   $1$
 *
 * @date   revision   marc laville  11/01/2020 : Usage de transform:translate à la place de top left
 * @date   revision   marc laville  07/03/2020 : String dataTransfert pour assurer la compatibilité avec les navigateurs autres que Firefox
 * @date   revision   marc laville  19/04/2020 : revision de translate
 * @date   revision   marc laville  25/10/2020 : utilisation de Object.assign
 *
 * A faire
 * - gestion d'une corbeille
 *
 * Gestion des post-it et enregistrement dans firebase
 */

function translate(element, dx, dy) {
	let elmtStyle = element.style;
	let	transform = elmtStyle.transform ?? '';
	let pos = transform.match(/translate\((-?\d+)px, (-?\d+)px\)/);
	
	elmtStyle.transform = pos 
//		? transform.replace( pos[0], ['translate(', +pos[1] + parseInt(dx), 'px,', +( pos[2] || 0 ) + parseInt(dy), 'px)'].join('') )
		? transform.replace( pos[0], `translate(${ +pos[1] + parseInt(dx) }px,${ +( pos[2] || 0 ) + parseInt(dy) }px)`)
		: 'translate(' + Array.from( [dx, dy], item => `${parseInt(item)}px` ).join() + ')';
}

var appPostIt = (function (contenaire) {
  var basePostIt = null,
    /**
     * dragging stuf
     */
    draggable = function (node) {
      var dataTransfert = '',
        onEvtDragStart = function (event) {
          dataTransfert = JSON.stringify({
            x: event.screenX,
            y: event.screenY,
          });
          event.dataTransfer.setData('position', dataTransfert);
          event.dataTransfer.effectAllowed = 'move';
          // make it half transparent
          node.style.opacity = 0.6;

          return;
        },
        onEvtDragEnd = function (event) {
          var jsonData = event.dataTransfer.getData('position'),
            data = JSON.parse(dataTransfert);
          //	data = JSON.parse(jsonData);

          translate(node, event.screenX - data.x, event.screenY - data.y);

          node.style.opacity = 1;

          return;
        };

      node.setAttribute('draggable', 'true');
      node.addEventListener('dragstart', onEvtDragStart, false);
      node.addEventListener('dragend', onEvtDragEnd, false);

      return node;
    },
    /**
     * post-it factory
     */
    creePostIt = function (param) {
      var element = document.createElement('div'), // le post-it
        delButton = element.appendChild(document.createElement('button')), // le bouton de fermeture
        textArea = element.appendChild(document.createElement('textarea')), // le champ de saisie du texte
        bd = basePostIt, // On garde une référence sur la base pour la fonction sauvPostIt
        bdNode = param.id || null,
        reflectChange = function (dataSnapshot) {
          var data = dataSnapshot.val();

          if (data) {
            textArea.value = data.text;
            element.style.transform =
              'translate(' + data.x + 'px,' + data.y + 'px)';
          } else {
            element.parentNode.removeChild(element);
          }
          return data;
        },
        delPostIt = () => bdNode.remove(),
        sauvPostIt = function () {
          let pos = element.style.transform
            ? element.style.transform.match(/translate\((-?\d+)px, (-?\d+)px\)/)
            : ['', 0, 0];
          let modele = {
            x: +pos[1],
            y: +pos[2],
            text: textArea.value,
          };

          if (bdNode) {
            bdNode.update(modele);
          } else {
            bdNode = bd.push(modele);
            bdNode.on('value', reflectChange);
          }

          return bdNode;
        },
        // Enregistre la position du post-it et le place au premier plan
        dragendPostIt = function () {
          sauvPostIt();
          return contenaire.lastChild === element
            ? element
            : contenaire.appendChild(contenaire.removeChild(element));
        };

      if (bdNode) {
        bdNode.on('value', reflectChange);
      }
      element.className = 'post-it';
      textArea.value = param.text || '';

      // staf de drag
      draggable(element);
      element.addEventListener('dragend', dragendPostIt);

      delButton.textContent = 'X';
      delButton.addEventListener('click', delPostIt, false);

      // contournement du fait que le caret n'a pas un comportement normal, lorsqu'il est fils d'un élèment draggable
      textArea.addEventListener('mouseover', () =>
        element.removeAttribute('draggable')
      );
      textArea.addEventListener('mouseout', () =>
        element.setAttribute('draggable', true)
      );
      textArea.addEventListener('blur', sauvPostIt);

      return element;
    },
    ajoutPostIt = (param) =>
      basePostIt
        ? contenaire.appendChild(
            creePostIt(Object.assign(param || {}, { x: 20, y: 20 }))
          )
        : null;

  (imgDock = function () {
    var img = li.appendChild(document.createElement('img'));

    img.setAttribute('src', './css/images/postit.png');
    img.addEventListener('dblclick', ajoutPostIt);

    return img;
  }),
    (lanceurDefault = function () {
      var button = document.createElement('button');

      button.addEventListener('dblclick', ajoutPostIt);

      return button;
    }),
    (postitFromDataSnapshot = (dataSnapshot) =>
      ajoutPostIt(
        Object.assign(
          { id: basePostIt.child(dataSnapshot.key()) },
          dataSnapshot.val()
        )
      ));

  (setLanceur = function (unElement) {
    var isNode = unElement instanceof Node;

    if (isNode) {
      unElement.addEventListener('click', (e) => ajoutPostIt());
    }
    return isNode;
  }),
    (setBase = function (unPath) {
      basePostIt = new Firebase(unPath);
      basePostIt.on('child_added', postitFromDataSnapshot);
    });

  contenaire = contenaire || document.body;

  return {
    setBase: setBase,
    setLanceur: setLanceur,
  };
})();

appPostIt.setBase('https://px-flux.firebaseio.com/postit/demo');
appPostIt.setLanceur(document.getElementById('creaPostIt'));